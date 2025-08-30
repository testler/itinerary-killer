import { useMemo, useState } from 'react';
import { ItineraryItem } from '../types';

type ImportJsonModalProps = {
  onClose: () => void;
  onImport: (items: ItineraryItem[]) => void;
};

type IncomingItem = Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'> & Partial<Pick<ItineraryItem, 'id' | 'createdAt' | 'completed'>>;

function coerceIncomingToItem(raw: any): { ok: true; value: Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'> } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Item is not an object' };

  const errors: string[] = [];

  const title = typeof raw.title === 'string' && raw.title.trim() ? String(raw.title).trim() : (errors.push('title'), null);
  const description = typeof raw.description === 'string' && raw.description.trim() ? String(raw.description).trim() : (errors.push('description'), null);
  const address = typeof raw.address === 'string' ? String(raw.address).trim() : (errors.push('address'), null);
  const category = typeof raw.category === 'string' ? String(raw.category).trim() : (errors.push('category'), null);
  const priority = raw.priority === 'low' || raw.priority === 'medium' || raw.priority === 'high' ? raw.priority : (errors.push('priority (low|medium|high)'), null);
  const estimatedDuration = Number.isFinite(raw.estimatedDuration) && raw.estimatedDuration > 0 ? Number(raw.estimatedDuration) : (errors.push('estimatedDuration (>0 minutes)'), null);
  const cost = Number.isFinite(raw.cost) && raw.cost >= 0 ? Number(raw.cost) : (errors.push('cost (>=0)'), null);
  const notes = typeof raw.notes === 'string' ? String(raw.notes) : '';
  const isOpen = typeof raw.isOpen === 'boolean' ? raw.isOpen : false;

  const locationOk = raw.location && typeof raw.location === 'object' && Number.isFinite(raw.location.lat) && Number.isFinite(raw.location.lng);
  if (!locationOk) errors.push('location { lat:number, lng:number }');
  const location = locationOk ? { lat: Number(raw.location.lat), lng: Number(raw.location.lng) } : undefined as any;

  let openingHours: ItineraryItem['openingHours'] | undefined = undefined;
  if (raw.openingHours && typeof raw.openingHours === 'object') {
    openingHours = {};
    for (const [day, val] of Object.entries(raw.openingHours)) {
      if (val === null) {
        (openingHours as any)[day] = null;
        continue;
      }
      if (val && typeof val === 'object' && typeof (val as any).open === 'string' && typeof (val as any).close === 'string') {
        (openingHours as any)[day] = { open: (val as any).open, close: (val as any).close };
      } else {
        errors.push(`openingHours.${day} must be { open:string, close:string } or null`);
      }
    }
  }

  if (errors.length) {
    return { ok: false, error: `Invalid fields: ${errors.join(', ')}` };
  }

  return {
    ok: true,
    value: {
      title: title!,
      description: description!,
      address: address!,
      category: category!,
      priority: priority!,
      estimatedDuration: estimatedDuration!,
      cost: cost!,
      notes,
      isOpen,
      location,
      openingHours,
    }
  };
}

export default function ImportJsonModal({ onClose, onImport }: ImportJsonModalProps) {
  const [text, setText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<IncomingItem[] | null>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setFileName(file.name);
    setText(content);
  };

  const handleParse = () => {
    setError(null);
    try {
      const json = JSON.parse(text);
      const arr = Array.isArray(json) ? json : [json];
      setParsed(arr as IncomingItem[]);
    } catch (e: any) {
      setParsed(null);
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  const { validItems, invalids } = useMemo(() => {
    const result = { validItems: [] as Omit<ItineraryItem, 'id' | 'createdAt' | 'completed'>[], invalids: [] as { index: number; error: string }[] };
    if (!parsed) return result;
    parsed.forEach((item, idx) => {
      const coerced = coerceIncomingToItem(item);
      if (coerced.ok) result.validItems.push(coerced.value);
      else result.invalids.push({ index: idx, error: coerced.error });
    });
    return result;
  }, [parsed]);

  const handleImport = () => {
    if (!validItems.length) {
      setError('No valid items to import');
      return;
    }
    const now = Date.now();
    const items: ItineraryItem[] = validItems.map((v, i) => ({
      ...v,
      id: (now + i).toString(),
      createdAt: new Date(),
      completed: false,
    }));
    onImport(items);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>Import Activities (JSON)</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12 }}>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) void handleFile(f);
              }}
            />
            {fileName && <span style={{ marginLeft: 8 }}>{fileName}</span>}
          </div>
          <textarea
            placeholder='Paste JSON here (array of items)'
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={handleParse}>Validate</button>
          </div>
          {error && (
            <div className="error" style={{ marginTop: 8, color: 'red' }}>{error}</div>
          )}
          {parsed && (
            <div style={{ marginTop: 8 }}>
              <div><strong>Valid:</strong> {validItems.length}</div>
              <div><strong>Invalid:</strong> {invalids.length}</div>
              {invalids.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary>View invalid items</summary>
                  <ul>
                    {invalids.map(inv => (
                      <li key={inv.index}>Item {inv.index + 1}: {inv.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleImport} disabled={!parsed || !validItems.length}>Import {validItems.length ? `(${validItems.length})` : ''}</button>
        </div>
      </div>
    </div>
  );
}


