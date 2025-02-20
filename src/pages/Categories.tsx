import React from 'react';

export const Categories = () => {
  const categories = [
    { id: 1, name: 'Technology', count: 24 },
    { id: 2, name: 'Business', count: 18 },
    { id: 3, name: 'Marketing', count: 15 },
    { id: 4, name: 'Education', count: 12 },
    { id: 5, name: 'Design', count: 20 },
  ];

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <div className="grid gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="text-lg">{category.name}</span>
              <span className="text-sm text-gray-400">{category.count} prompts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 