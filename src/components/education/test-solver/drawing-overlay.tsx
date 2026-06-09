"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DrawingOverlayRef {
    clear: () => void;
    getDataURL: () => string;
    loadDataURL: (dataURL: string) => void;
}

interface DrawingOverlayProps {
    className?: string;
    disabled?: boolean;
    tool?: 'pen' | 'eraser';
    color?: string;
    strokeWidth?: number;
    onChange?: () => void; // Triggered on mouse up / touch end
}

export const DrawingOverlay = React.forwardRef<DrawingOverlayRef, DrawingOverlayProps>(
    ({ className, disabled = false, tool = 'pen', color = '#ef4444', strokeWidth = 3, onChange }, ref) => {
        const canvasRef = React.useRef<HTMLCanvasElement>(null);
        const [isDrawing, setIsDrawing] = React.useState(false);
        const contextRef = React.useRef<CanvasRenderingContext2D | null>(null);

        const initCanvas = React.useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Handle high DPI displays for crisp drawing
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (!rect) return;

            // Check if already initialized with same size to prevent clear
            if (canvas.width === rect.width * window.devicePixelRatio && canvas.height === rect.height * window.devicePixelRatio) {
                return;
            }

            // Save existing content before resizing
            const currentData = canvas.toDataURL();

            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                contextRef.current = ctx;

                // Restore content
                if (currentData && currentData !== "data:,") {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, rect.width, rect.height);
                    };
                    img.src = currentData;
                }
            }
        }, []);

        React.useEffect(() => {
            initCanvas();
            const handleResize = () => initCanvas();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, [initCanvas]);

        React.useEffect(() => {
            if (contextRef.current) {
                if (tool === 'eraser') {
                    contextRef.current.globalCompositeOperation = 'destination-out';
                    contextRef.current.lineWidth = strokeWidth * 5; // Eraser is thicker
                } else {
                    contextRef.current.globalCompositeOperation = 'source-over';
                    contextRef.current.strokeStyle = color;
                    contextRef.current.lineWidth = strokeWidth;
                }
            }
        }, [tool, color, strokeWidth]);

        React.useImperativeHandle(ref, () => ({
            clear: () => {
                const canvas = canvasRef.current;
                const ctx = contextRef.current;
                if (!canvas || !ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (onChange) onChange();
            },
            getDataURL: () => {
                if (!canvasRef.current) return "";
                return canvasRef.current.toDataURL();
            },
            loadDataURL: (dataURL: string) => {
                const canvas = canvasRef.current;
                const ctx = contextRef.current;
                if (!canvas || !ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (!dataURL) return;
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
                };
                img.src = dataURL;
            }
        }));

        const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (disabled) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            // Release pointer capture to ensure we receive events if cursor moves outside quickly
            canvas.setPointerCapture(e.pointerId);

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            contextRef.current?.beginPath();
            contextRef.current?.moveTo(x, y);
            setIsDrawing(true);
            e.preventDefault();
        };

        const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isDrawing || disabled) return;
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            contextRef.current?.lineTo(x, y);
            contextRef.current?.stroke();
            e.preventDefault();
        };

        const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isDrawing) return;
            contextRef.current?.closePath();
            setIsDrawing(false);
            if (canvasRef.current) {
                canvasRef.current.releasePointerCapture(e.pointerId);
            }
            if (onChange) onChange();
            e.preventDefault();
        };

        return (
            <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                className={cn(
                    "absolute inset-0 z-40 touch-none",
                    disabled ? "pointer-events-none" : "cursor-crosshair",
                    className
                )}
                style={{ touchAction: 'none' }}
            />
        );
    }
);

DrawingOverlay.displayName = "DrawingOverlay";
