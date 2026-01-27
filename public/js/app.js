// Initialize form
document.getElementById('date').valueAsDate = new Date();

// Form submission handler
document.getElementById('meetingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('message');

    btn.disabled = true;
    btn.textContent = 'Creazione in corso...';
    msg.style.display = 'none';

    try {
        const res = await fetch('/api/meeting/create', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: document.getElementById('title').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                duration: parseInt(document.getElementById('duration').value),
                location: document.getElementById('location').value,
                attendees: document.getElementById('attendees').value.split('\n').filter(e => e.trim()),
                organizerEmail: document.getElementById('organizerEmail').value,
                organizerName: document.getElementById('organizerName').value
            })
        });

        const result = await res.json();

        if (result.success) {
            msg.className = 'message success';
            msg.textContent = '✅ Meeting creato! Gli inviti sono stati inviati.';
            msg.style.display = 'block';
            document.getElementById('meetingForm').reset();
            document.getElementById('date').valueAsDate = new Date();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        msg.className = 'message error';
        msg.textContent = '❌ Errore: ' + error.message;
        msg.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Crea Meeting e Invia Inviti';
    }
});
