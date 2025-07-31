export async function setSchedulerTime(hour, minute) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const endpoint = `${apiUrl}/scheduler/time`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hour, minute })
  });
  if (!res.ok) throw new Error('Failed to update scheduler time');
  return res.json();
}
// Service to enable/disable notifications on the backend
export async function setNotificationsOn(on) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const endpoint = on
    ? `${apiUrl}/notifications/on`
    : `${apiUrl}/notifications/off`;
  const res = await fetch(endpoint, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to update notification setting');
  return res.json();
}
