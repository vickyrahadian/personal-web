const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {read, write} = require('../../shared/csv');

const router = express.Router();

function createAnalyticsRouter({dataDir, contactsPath, analyticsSalt, isAdmin}) {
    const visitorsPath = path.join(dataDir, 'analytics/visitors.csv');
    const trafficPath = path.join(dataDir, 'analytics/traffic.csv');
    const performancePath = path.join(dataDir, 'analytics/performance.csv');
    const visitorHeader = '"visitor_id","first_seen","last_seen","ip_hash","country","city","device","browser","os","language","timezone","screen_size"';
    const trafficHeader = '"timestamp","visitor_id","session_id","event","path","referrer","duration_ms"';
    const performanceHeader = '"timestamp","visitor_id","path","load_time_ms","lcp_ms","cls","inp_ms"';

    const clean = (value, fallback = '') => String(value ?? fallback).slice(0, 500);
    const day = timestamp => String(timestamp).slice(0, 10);
    const hashIp = req => crypto.createHash('sha256').update(`${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'}|${analyticsSalt}`).digest('hex').slice(0, 24);
    const readVisitors = () => read(visitorsPath, values => ({
        visitor_id: values[0],
        first_seen: values[1],
        last_seen: values[2],
        ip_hash: values[3],
        country: values[4],
        city: values[5],
        device: values[6],
        browser: values[7],
        os: values[8],
        language: values[9],
        timezone: values[10],
        screen_size: values[11]
    }));
    const append = (filePath, header, row) => {
        fs.mkdirSync(path.dirname(filePath), {recursive: true});
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, `${header}\n`);
        fs.appendFileSync(filePath, `${row.map(value => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(',')}\n`);
    };

    router.post('/track', (req, res) => {
        const body = req.body || {};
        const visitorId = clean(body.visitor_id);
        const sessionId = clean(body.session_id);
        const timestamp = new Date().toISOString();
        if (!visitorId || !sessionId) return res.status(400).json({error: 'Visitor and session IDs are required.'});

        const visitors = readVisitors();
        const existing = visitors.find(visitor => visitor.visitor_id === visitorId);
        const profile = {
            visitor_id: visitorId,
            first_seen: existing?.first_seen || timestamp,
            last_seen: timestamp,
            ip_hash: existing?.ip_hash || hashIp(req),
            country: clean(body.country), city: clean(body.city), device: clean(body.device),
            browser: clean(body.browser), os: clean(body.os), language: clean(body.language),
            timezone: clean(body.timezone), screen_size: clean(body.screen_size)
        };
        const visitorIndex = visitors.findIndex(visitor => visitor.visitor_id === visitorId);
        if (visitorIndex === -1) visitors.push(profile); else visitors[visitorIndex] = {...visitors[visitorIndex], ...profile};
        write(visitorsPath, visitorHeader, visitors.map(visitor => [visitor.visitor_id, visitor.first_seen, visitor.last_seen, visitor.ip_hash, visitor.country, visitor.city, visitor.device, visitor.browser, visitor.os, visitor.language, visitor.timezone, visitor.screen_size]));

        append(trafficPath, trafficHeader, [timestamp, visitorId, sessionId, clean(body.event, 'pageview'), clean(body.path, '/'), clean(body.referrer), Number(body.duration_ms) || 0]);
        if (body.load_time_ms) append(performancePath, performanceHeader, [timestamp, visitorId, clean(body.path, '/'), Number(body.load_time_ms) || 0, Number(body.lcp_ms) || 0, Number(body.cls) || 0, Number(body.inp_ms) || 0]);
        res.json({success: true});
    });

    router.get('/overview', (req, res) => {
        if (!isAdmin(req)) return res.status(401).json({error: 'Unauthorized'});
        const traffic = read(trafficPath, ([timestamp, visitor_id, session_id, event, routePath, referrer, duration_ms]) => ({
            timestamp,
            visitor_id,
            session_id,
            event,
            path: routePath,
            referrer,
            duration_ms: Number(duration_ms) || 0
        }));
        const performance = read(performancePath, ([timestamp, visitor_id, routePath, load_time_ms, lcp_ms, cls, inp_ms]) => ({
            timestamp,
            visitor_id,
            path: routePath,
            load_time_ms: Number(load_time_ms) || 0,
            lcp_ms: Number(lcp_ms) || 0,
            cls: Number(cls) || 0,
            inp_ms: Number(inp_ms) || 0
        }));
        const visitors = readVisitors();
        const contacts = read(contactsPath, ([timestamp, name, email, message]) => ({
            timestamp,
            name,
            email,
            message
        })).reverse().slice(0, 5);
        const today = new Date().toISOString().slice(0, 10);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const pageviewsToday = traffic.filter(item => day(item.timestamp) === today && item.event === 'pageview');
        const lastSeven = traffic.filter(item => new Date(item.timestamp).getTime() >= cutoff && item.event === 'pageview');
        const avg = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
        const countBy = (items, key) => items.reduce((result, item) => {
            const value = item[key] || 'Unknown';
            result[value] = (result[value] || 0) + 1;
            return result;
        }, {});
        const referrers = countBy(traffic.filter(item => item.referrer), 'referrer');
        const topReferrer = Object.entries(referrers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Direct';
        const latestTrafficByVisitor = new Map();
        traffic.forEach(item => {
            const current = latestTrafficByVisitor.get(item.visitor_id);
            if (!current || new Date(item.timestamp).getTime() > new Date(current.timestamp).getTime()) {
                latestTrafficByVisitor.set(item.visitor_id, item);
            }
        });
        const recentVisitors = visitors
            .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
            .slice(0, 10)
            .map(visitor => {
                const latestTraffic = latestTrafficByVisitor.get(visitor.visitor_id);
                return {
                    ...visitor,
                    last_path: latestTraffic?.path || '/',
                    last_referrer: latestTraffic?.referrer || '',
                    last_event: latestTraffic?.event || '',
                    last_session_id: latestTraffic?.session_id || ''
                };
            });
        const memory = process.memoryUsage();
        res.json({
            traffic: {
                visitorsToday: new Set(pageviewsToday.map(item => item.visitor_id)).size,
                pageViewsToday: pageviewsToday.length,
                visitorsLast7Days: new Set(lastSeven.map(item => item.visitor_id)).size,
                topReferrer,
                deviceBreakdown: countBy(pageviewsToday.map(item => ({device: visitors.find(visitor => visitor.visitor_id === item.visitor_id)?.device || 'Unknown'})), 'device')
            },
            performance: {
                averagePageLoad: avg(performance.map(item => item.load_time_ms).filter(Boolean)),
                samples: performance.length
            },
            recentVisitors,
            recentContacts: contacts,
            health: {
                uptimeSeconds: Math.round(process.uptime()),
                memoryMb: Math.round(memory.rss / 1024 / 1024),
                node: process.version,
                status: 'Online'
            }
        });
    });

    return router;
}

module.exports = createAnalyticsRouter;
