"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  calculateProfessionPositions,
  isPointInCircle,
  findClosestProfession,
} from "@/utils/wheelGeometry";

export interface Profession {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  growthPerspective?: string;
  estimatedSalary?: string;
  requiredSkills?: string;
}

interface ProfessionWheelProps {
  professions: Profession[];
  onSelect: (profession: Profession) => void;
  isLoading?: boolean;
  hoveredIndex?: number | null;
  onHover?: (index: number | null) => void;
}

/**
 * Interactive profession wheel component
 * Renders professions in a circular layout with Canvas API
 */
export const ProfessionWheel: React.FC<ProfessionWheelProps> = ({
  professions,
  onSelect,
  isLoading = false,
  hoveredIndex = null,
  onHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Draw wheel
  useEffect(() => {
    if (!canvasRef.current || isLoading || professions.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 80;
    const professionRadius = 40;

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate positions
    const positions = calculateProfessionPositions(
      professions.length,
      radius,
      centerX,
      centerY
    );

    // Draw professions
    for (let i = 0; i < professions.length; i++) {
      const profession = professions[i];
      const position = positions[i];
      const isHovered = i === hoveredIndex;
      const size = isHovered ? professionRadius + 10 : professionRadius;

      // Draw circle background
      ctx.fillStyle = isHovered ? "#3b82f6" : "#e5e7eb";
      ctx.beginPath();
      ctx.arc(position.x, position.y, size, 0, 2 * Math.PI);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isHovered ? "#1e40af" : "#d1d5db";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw profession name
      ctx.fillStyle = "#000000";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Wrap text if needed
      const maxWidth = size * 2;
      const words = profession.name.split(" ");
      let line = "";
      let y = position.y + size + 25;

      for (let j = 0; j < words.length; j++) {
        const testLine = line + (line ? " " : "") + words[j];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, position.x, y);
          line = words[j];
          y += 14;
        } else {
          line = testLine;
        }
      }

      if (line) {
        ctx.fillText(line, position.x, y);
      }
    }
  }, [professions, hoveredIndex, isLoading, dimensions]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    const positions = calculateProfessionPositions(
      professions.length,
      radius,
      centerX,
      centerY
    );

    const professionRadius = 40;
    const index = findClosestProfession(x, y, positions, professionRadius + 10);

    if (index >= 0) {
      onSelect(professions[index]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onHover) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    const positions = calculateProfessionPositions(
      professions.length,
      radius,
      centerX,
      centerY
    );

    const professionRadius = 40;
    const index = findClosestProfession(x, y, positions, professionRadius + 10);

    onHover(index >= 0 ? index : null);
  };

  const handleCanvasMouseLeave = () => {
    if (onHover) {
      onHover(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading professions...</p>
        </div>
      </div>
    );
  }

  if (professions.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-gray-600">No professions available</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
      className="w-full h-full cursor-pointer bg-white rounded-lg shadow-lg"
      style={{ touchAction: "none" }}
    />
  );
};
