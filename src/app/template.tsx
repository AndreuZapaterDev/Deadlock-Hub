// A diferencia de layout.tsx, template.tsx se vuelve a montar en cada navegación: la animación CSS se repite sin JavaScript.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
