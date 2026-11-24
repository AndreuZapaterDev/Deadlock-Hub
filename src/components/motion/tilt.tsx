"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * Inclinación 3D siguiendo el cursor, con un brillo que se desplaza por la tarjeta.
 * La estructura del DOM es la misma con o sin movimiento reducido (evita errores de hidratación):
 * con movimiento reducido simplemente no se actualizan los valores.
 */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 22 };
  const rotateY = useSpring(useTransform(x, [0, 1], [-9, 9]), spring);
  const rotateX = useSpring(useTransform(y, [0, 1], [9, -9]), spring);
  const gx = useTransform(x, [0, 1], [0, 100]);
  const gy = useTransform(y, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.16), transparent 55%)`;
  const glareOpacity = useSpring(0, spring);

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
        glareOpacity.set(1);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); glareOpacity.set(0); }}
    >
      <div className="relative">
        {children}
        <motion.div aria-hidden className="chamfer pointer-events-none absolute inset-0" style={{ background: glare, opacity: glareOpacity }} />
      </div>
    </motion.div>
  );
}
