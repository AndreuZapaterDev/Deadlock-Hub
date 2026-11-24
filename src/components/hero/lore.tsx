/** Historia del héroe en párrafos: el primero siempre visible y el resto plegado (<details>, sin JavaScript). */
export function Lore({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return <p className="text-ink-muted">Este héroe aún no tiene historia publicada.</p>;
  const [first, ...rest] = paragraphs;
  return (
    <div className="max-w-prose space-y-3 font-serif text-lg leading-relaxed">
      <p>{first}</p>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold text-teal-ink underline-offset-2 hover:underline marker:content-none">
            <span className="group-open:hidden">Seguir leyendo ({rest.length} {rest.length === 1 ? "párrafo más" : "párrafos más"}) ▾</span>
            <span className="hidden group-open:inline">Mostrar menos ▴</span>
          </summary>
          <div className="mt-3 space-y-3">{rest.map((p, i) => <p key={i}>{p}</p>)}</div>
        </details>
      )}
    </div>
  );
}
