import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export function AdminInvitations() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);

  const load = async () => {
    try {
      const res = await api.getInvitations();
      setInvitations(res.invitations);
    } catch (e) {
      // not super admin or error
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createInvitation(code, maxUses);
    setCode('');
    setMaxUses(1);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteInvitation(id);
    load();
  };

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-xl font-bold mb-4">Admin: Invitation Codes</h2>
      <form onSubmit={handleCreate} className="flex gap-4 mb-6">
        <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Code (e.g. TEAM-2026)" className="border px-3 py-2 rounded" required />
        <input type="number" value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} placeholder="Max Uses" className="border w-24 px-3 py-2 rounded" required min="0" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Code</button>
      </form>
      <ul className="space-y-2">
        {invitations.map(inv => (
          <li key={inv.id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
            <div>
              <span className="font-bold">{inv.code}</span>
              <span className="text-sm text-gray-500 ml-4">Used: {inv.used_count} / {inv.max_uses === 0 ? 'Unlimited' : inv.max_uses}</span>
            </div>
            <button onClick={() => handleDelete(inv.id)} className="text-red-600 hover:underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
