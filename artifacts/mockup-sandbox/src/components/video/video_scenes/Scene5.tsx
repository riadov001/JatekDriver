import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const profileImg = "/driver_screenshots/profile.jpg";

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center pt-[5vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="relative z-10 w-[22vw] aspect-[9/19] rounded-[2vw] overflow-hidden border-[0.5vw] border-[#1a2238] shadow-2xl"
        initial={{ opacity: 0, scale: 1.5, y: -100 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 1.5, y: -100 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <img src={profileImg} className="w-full h-full object-cover" alt="Profile screen" />
      </motion.div>

      <motion.div 
        className="mt-[6vh] text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-[4vw] font-black tracking-tight mb-[1vh]">Join the Fleet.</h2>
        <div className="w-[10vw] h-[0.5vw] bg-[#ec1e5a] mx-auto rounded-full" />
      </motion.div>

      {phase >= 3 && (
        <motion.div 
          className="absolute inset-0 bg-[#0A1128] z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="flex items-center gap-[2vw]">
             <div className="w-[4vw] h-[4vw] bg-[#ec1e5a] rounded-md rotate-45" />
             <h1 className="text-[6vw] font-black tracking-tighter">
               Jatek<span className="text-[#ec1e5a]">Livreur</span>
             </h1>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}