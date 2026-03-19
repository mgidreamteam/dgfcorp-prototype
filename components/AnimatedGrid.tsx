import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const AnimatedGrid: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { dashboardTheme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        
        const GRID_SIZE = 40;
        const PARTICLE_COUNT = 40;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            speed: number;
            canvasWidth: number;
            canvasHeight: number;

            constructor(canvasWidth: number, canvasHeight: number) {
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                // Snap particle to grid intersection
                this.x = Math.floor(Math.random() * (canvasWidth / GRID_SIZE)) * GRID_SIZE;
                this.y = Math.floor(Math.random() * (canvasHeight / GRID_SIZE)) * GRID_SIZE;
                this.speed = 0.5 + Math.random() * 1; 
                
                const directions = [[this.speed, 0], [-this.speed, 0], [0, this.speed], [0, -this.speed]];
                const randDir = directions[Math.floor(Math.random() * directions.length)];
                this.vx = randDir[0];
                this.vy = randDir[1];
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Make turn decisions closer to intersections
                // Canvas coordinates have decimals due to speed, so we check distance to nearest grid boundary
                const nearX = Math.abs(this.x % GRID_SIZE);
                const nearY = Math.abs(this.y % GRID_SIZE);
                
                if (nearX < this.speed && nearY < this.speed) {
                    // Snap exactly to grid to prevent drift
                    this.x = Math.round(this.x / GRID_SIZE) * GRID_SIZE;
                    this.y = Math.round(this.y / GRID_SIZE) * GRID_SIZE;

                    // 10% chance to change direction at any intersection
                    if (Math.random() > 0.9) {
                        const directions = [[this.speed, 0], [-this.speed, 0], [0, this.speed], [0, -this.speed]];
                        const randDir = directions[Math.floor(Math.random() * directions.length)];
                        this.vx = randDir[0];
                        this.vy = randDir[1];
                    }
                }

                // Wrap around screen gently
                if (this.x < 0) this.x = this.canvasWidth;
                if (this.x > this.canvasWidth) this.x = 0;
                if (this.y < 0) this.y = this.canvasHeight;
                if (this.y > this.canvasHeight) this.y = 0;
            }

            draw(ctx: CanvasRenderingContext2D, color: string) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        let particles: Particle[] = [];

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const drawGrid = () => {
            // Draw a subtle grid if we're not over Blueprint (because Blueprint CSS handles it) or just reinforce it
            ctx.strokeStyle = dashboardTheme === 'blueprint' ? 'rgba(0, 255, 204, 0.05)' : 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }
            for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }
            ctx.stroke();
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Only explicitly draw grid on canvas for Giga, as Blueprint uses CSS gradients
            if (dashboardTheme === 'dream-giga') {
                drawGrid();
            }

            const particleColor = dashboardTheme === 'blueprint' ? '#00ffcc' : '#ffffff';
            particles.forEach(p => {
                p.update();
                p.draw(ctx, particleColor);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('resize', resize);
        resize();
        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [dashboardTheme]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />
    );
};

export default AnimatedGrid;
