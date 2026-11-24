import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";

export const metadata: Metadata = { title: "Acerca de", description: "Deadlock Hub es una web fan no oficial. Créditos, fuentes de datos y privacidad." };

const ext = "font-semibold text-teal-ink underline underline-offset-2";

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <PosterHeader compact title="Acerca de" subtitle="Una web fan, hecha con datos de la comunidad" />

      <section aria-labelledby="unofficial" className="space-y-3">
        <SectionTitle id="unofficial">Web no oficial</SectionTitle>
        <p className="max-w-prose">
          Deadlock Hub es una web fan no oficial. No está afiliada ni respaldada por Valve. Deadlock y todos sus recursos
          (nombres, imágenes, textos) son propiedad de Valve Corporation. La web no usa el logo de Valve ni el de Deadlock como propio.
        </p>
      </section>

      <section aria-labelledby="credits" className="space-y-3">
        <SectionTitle id="credits">Créditos y fuentes de datos</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="font-display text-lg font-black">Deadlock API</h3>
            <p className="text-sm text-ink-muted">
              Casi todos los datos (héroes, objetos, estadísticas, jugadores, partidas, parches y mapa) salen del proyecto comunitario{" "}
              <a className={ext} href="https://deadlock-api.com" target="_blank" rel="noopener noreferrer">Deadlock API</a>, que tampoco es oficial de Valve.
              Si te sirve, considera apoyarlo.
            </p>
          </Card>
          <Card className="space-y-2">
            <h3 className="font-display text-lg font-black">Valve y la comunidad</h3>
            <p className="text-sm text-ink-muted">
              Las notas de parche vienen del{" "}
              <a className={ext} href="https://forums.playdeadlock.com/forums/changelog.10/" target="_blank" rel="noopener noreferrer">foro oficial</a> y de las noticias de Steam. Aquí solo se enlazan y se muestran como referencia.
            </p>
          </Card>
        </div>
        <p className="max-w-prose text-sm text-ink-muted">
          Los textos explicativos de la web (mecánicas, guías de uso) están escritos para este proyecto. Los textos propios del juego (nombres y descripciones)
          se muestran tal como los devuelve la API, en el idioma elegido.
        </p>
      </section>

      <section aria-labelledby="accuracy" className="space-y-3">
        <SectionTitle id="accuracy">Qué es aproximado</SectionTitle>
        <ul className="max-w-prose list-disc space-y-1 pl-5 text-sm">
          <li>El <strong>tier</strong> de cada héroe se calcula con el win rate ajustado por número de partidas (la fórmula está en la tier list).</li>
          <li>La <strong>calculadora de nivel</strong>, la <strong>curva de daño del arma</strong> y el <strong>build planner</strong> son estimaciones lineales a partir de los datos de la API, sin la fórmula exacta del motor.</li>
          <li>Los <strong>cambios entre parches</strong> se calculan comparando números de dos versiones; las notas oficiales pueden decir más.</li>
        </ul>
      </section>

      <section aria-labelledby="privacy" className="space-y-3">
        <SectionTitle id="privacy">Privacidad</SectionTitle>
        <p className="max-w-prose text-sm">
          No hay cuentas ni base de datos propia, no se usa publicidad ni analítica de terceros y no se guardan datos personales de los jugadores.
          En tu navegador se guardan solo preferencias: el tema (día/noche), el idioma (una cookie) y, si los usas, los jugadores que sigues, tus builds
          y los héroes elegidos para comparar. Puedes borrarlos desde los ajustes del navegador.
        </p>
      </section>
    </div>
  );
}
