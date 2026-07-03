import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const earningsImg = "/driver_screenshots/earnings.jpg";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw]"
      initial={{ opacity: 0, scale: 1.2 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: '-100%' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className="w-1/2 pr-[5vw] z-10">
        <motion.h2 
          className="text-[5vw] font-black leading-[1.1] mb-[2vh]"
          initial={{ opacity: 0, y: -50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          Track Your <br/><span className="text-[#00d2ff]">Earnings.</span>
        </motion.h2>
        <motion.p 
          className="text-[1.8vw] text-white/70"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          See what you make daily, weekly, and monthly with full transparency.
        </motion.p>

        {phase >= 3 && (
          <div className="mt-[5vh] flex gap-[2vw]">
            {[1, 2, 3].map((i) => (
              <motion.div 
                key={i}
                className="w-[1vw] h-[10vw] bg-[#ec1e5a] rounded-t-sm origin-bottom"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [0.2, Math.random() * 0.8 + 0.2] }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-1/2 flex justify-center relative">
        <motion.div 
          className="relative z-10 w-[24vw] aspect-[9/19] rounded-[2vw] overflow-hidden border-[0.5vw] border-[#1a2238] shadow-[0_20px_50px_rgba(0,210,255,0.2)]"
          initial={{ opacity: 0, y: 50, rotateX: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ perspective: 1000 }}
        >
          <img src={earningsImg} className="w-full h-full object-cover" alt="Earnings screen" />
        </motion.div>
      </div>
    </motion.div>
  );
}