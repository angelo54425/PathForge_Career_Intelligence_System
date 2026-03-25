export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''; // server-side
  let id = localStorage.getItem('pathforge_device_id');
  if (!id) {
    id = crypto.randomUUID(); // or use a simple uuid generator
    localStorage.setItem('pathforge_device_id', id);
  }
  return id;
}