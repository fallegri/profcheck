"use client";

import React from "react";
import Image from "next/image";

export interface Profession {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  growthPerspective?: string;
  estimatedSalary?: string;
  requiredSkills?: string;
}

interface ProfessionPanelProps {
  profession: Profession | null;
  onClose: () => void;
  isOpen?: boolean;
}

/**
 * Panel component to display detailed information about a selected profession
 */
export const ProfessionPanel: React.FC<ProfessionPanelProps> = ({
  profession,
  onClose,
  isOpen = true,
}) => {
  if (!profession || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{profession.name}</h2>
            {profession.description && (
              <p className="text-blue-100">{profession.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-white hover:bg-blue-700 rounded-full p-2 transition-colors"
            aria-label="Close panel"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image */}
          {profession.imageUrl && (
            <div className="flex justify-center">
              <Image
                src={profession.imageUrl}
                alt={profession.name}
                width={192}
                height={192}
                className="object-cover rounded-lg shadow-md"
                loading="lazy"
                quality={75}
              />
            </div>
          )}

          {/* Growth Perspective */}
          {profession.growthPerspective && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Growth Perspective
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {profession.growthPerspective}
              </p>
            </div>
          )}

          {/* Estimated Salary */}
          {profession.estimatedSalary && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Estimated Salary
              </h3>
              <p className="text-gray-700 text-lg font-medium">
                {profession.estimatedSalary}
              </p>
            </div>
          )}

          {/* Required Skills */}
          {profession.requiredSkills && (
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {profession.requiredSkills.split(",").map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
