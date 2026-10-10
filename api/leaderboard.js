export default async function handler(req, res) {
    const TURSO_URL = process.env.TURSO_URL;
    const TURSO_TOKEN = process.env.TURSO_TOKEN;

    if (!TURSO_URL || !TURSO_TOKEN) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (req.method === 'GET') {
        try {
            const res2 = await fetch(TURSO_URL + '/v2/pipeline', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + TURSO_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [
                        { type: 'execute', stmt: { sql: 'SELECT name, guesses, time, lang FROM leaderboard ORDER BY guesses ASC, time ASC LIMIT 100' } },
                        { type: 'close' }
                    ]
                })
            });
            const data = await res2.json();
            if (!res2.ok) return res.status(500).json({ error: 'Turso error: ' + JSON.stringify(data) });

            const result = data.results[0];
            if (!result || result.type !== 'ok') return res.json([]);

            const rows = result.response.result.rows || [];
            const parsed = rows.map(r => r.map(cell => cell.value !== undefined ? cell.value : cell));
            return res.json(parsed);
        } catch (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
    }

    if (req.method === 'POST') {
        const { name, guesses, time, lang } = req.body;
        if (!name || !guesses || time === undefined || !lang) {
            return res.status(400).json({ error: 'Bad request' });
        }
        if (typeof name !== 'string' || name.length > 20) {
            return res.status(400).json({ error: 'Invalid name' });
        }
        if (typeof guesses !== 'number' || guesses < 1 || guesses > 5) {
            return res.status(400).json({ error: 'Invalid guesses' });
        }
        if (typeof time !== 'number' || time < 0 || time > 300) {
            return res.status(400).json({ error: 'Invalid time' });
        }
        if (!['id', 'en'].includes(lang)) {
            return res.status(400).json({ error: 'Invalid lang' });
        }

        try {
            const res2 = await fetch(TURSO_URL + '/v2/pipeline', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + TURSO_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [
                        {
                            type: 'execute',
                            stmt: {
                                sql: 'INSERT INTO leaderboard (name, guesses, time, lang) VALUES (?, ?, ?, ?)',
                                args: [
                                    { type: 'text', value: name },
                                    { type: 'integer', value: String(guesses) },
                                    { type: 'integer', value: String(time) },
                                    { type: 'text', value: lang }
                                ]
                            }
                        },
                        {
                            type: 'execute',
                            stmt: {
                                sql: "DELETE FROM leaderboard WHERE id NOT IN (SELECT id FROM leaderboard ORDER BY guesses ASC, time ASC LIMIT 100)"
                            }
                        },
                        { type: 'close' }
                    ]
                })
            });
            const data = await res2.json();
            if (!res2.ok) {
                return res.status(500).json({ error: 'Turso error: ' + JSON.stringify(data) });
            }
            const result = data.results[0];
            if (result && result.type === 'error') {
                return res.status(500).json({ error: 'SQL error: ' + result.error.message });
            }
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}   