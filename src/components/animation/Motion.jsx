"use client";

import { motion } from "framer-motion";

export default function Motion({
  children,
  delay = 0,
  y = 30,
  x = 0,
  scale = 1,
  blur = false,
  hover = false,
  className = "",
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y,
        x,
        scale: blur ? 0.95 : scale,
        filter: blur ? "blur(10px)" : "blur(0px)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={
        hover
          ? {
              y: -6,
              scale: 1.02,
            }
          : undefined
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}