export default async function handler(req, res) {
    const TURSO_URL = process.env.TURSO_URL;
    const TURSO_TOKEN = process.env.TURSO_TOKEN;

    if (!TURSO_URL || !TURSO_TOKEN) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

   if (req.method === 'GET') {
    try {
        const res2 = await fetch(TURSO_URL + '/v0/sql', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TURSO_TOKEN },
            body: JSON.stringify([{
                sql: 'SELECT name, guesses, time FROM leaderboard ORDER BY guesses ASC, time ASC LIMIT 50',
                params: []
            }])
        });
        const data = await res2.json();

        if (!Array.isArray(data) || !data[0]) {
            return res.json([]);
        }
        return res.json(data[0].columns || []);
    } catch (err) {
        return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    }   

    if (req.method === 'POST') {
        const { name, guesses, time } = req.body;
        if (!name || !guesses || time === undefined) {
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
        try {
            await fetch(TURSO_URL + '/v0/sql', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + TURSO_TOKEN },
                body: JSON.stringify([{
                    sql: 'INSERT INTO leaderboard (name, guesses, time) VALUES (?, ?, ?)',
                    params: [name, guesses, time]
                }])
            });
            return res.json({ ok: true });
        } catch (err) {
            return res.status(500).json({ error: 'Database error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}   