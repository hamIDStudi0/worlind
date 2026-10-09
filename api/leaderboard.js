export default async function handler(req, res) {
    const TURSO_URL = process.env.TURSO_URL;
    const TURSO_TOKEN = process.env.TURSO_TOKEN;

    if (!TURSO_URL || !TURSO_TOKEN) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (req.method === 'GET') {
        try {
            const data = await fetch(TURSO_URL + '/v0/sql', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + TURSO_TOKEN },
                body: JSON.stringify([{
                    sql: 'SELECT name, guesses, time, lang FROM leaderboard ORDER BY guesses ASC, time ASC LIMIT 100',
                    params: []
                }])
            }).then(r => r.json());
            if (!Array.isArray(data) || !data[0]) return res.json([]);
            return res.json(data[0].columns || []);
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
            const body = JSON.stringify([
                { sql: 'INSERT INTO leaderboard (name, guesses, time, lang) VALUES (?, ?, ?, ?)', params: [name, guesses, time, lang] },
                { sql: "DELETE FROM leaderboard WHERE id NOT IN (SELECT id FROM leaderboard ORDER BY guesses ASC, time ASC LIMIT 100)", params: [] }
            ]);

            await fetch(TURSO_URL + '/v0/sql', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + TURSO_TOKEN },
                body: body
            });

            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
    }   

    return res.status(405).json({ error: 'Method not allowed' });
}   