import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ordersImg = "/driver_screenshots/orders.jpg";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw]"
      initial={{ opacity: 0, clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)' }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: 'circOut' }}
    >
      <div className="w-1/2 flex justify-center relative">
        <motion.div 
          className="relative z-10 w-[24vw] aspect-[9/19] rounded-[2vw] overflow-hidden border-[0.5vw] border-[#1a2238] shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, rotate: -10, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, rotate: 5, scale: 1 } : { opacity: 0, rotate: -10, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
        >
          <img src={ordersImg} className="w-full h-full object-cover" alt="Orders screen" />
        </motion.div>
        
        {/* Animated cards simulating order items popping out */}
        {phase >= 3 && (
          <motion.div 
            className="absolute z-20 top-[40%] -right-[5vw] w-[14vw] h-[6vw] bg-[#1a2238] rounded-xl border border-[#ec1e5a]/50 p-[1vw] shadow-lg flex items-center gap-[1vw]"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="w-[3vw] h-[3vw] bg-[#ec1e5a] rounded-full opacity-50" />
            <div className="flex flex-col gap-[0.5vw]">
              <div className="w-[6vw] h-[0.8vw] bg-white/80 rounded" />
              <div className="w-[4vw] h-[0.6vw] bg-white/40 rounded" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="w-1/2 pl-[5vw]">
        <motion.h2 
          className="text-[5vw] font-black leading-none mb-[2vh]"
          initial={{ opacity: 0, x: 50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6 }}
        >
          Manage <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ec1e5a] to-[#ff6b6b]">Orders</span> easily.
        </motion.h2>
        <motion.p 
          className="text-[1.8vw] text-white/70"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Clear insights. Turn-by-turn routing. Happy customers.
        </motion.p>
      </div>
    </motion.div>
  );
}