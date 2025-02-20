import React from 'react';
import { FaLightbulb, FaHeart, FaLaugh, FaBook, FaStar, FaBriefcase, FaUsers, FaLeaf } from 'react-icons/fa';
import Link from 'next/link';
import { Category } from '../types/categories';

export default function Categories() {
  const categories: Category[] = [
    {
      id: 1,
      name: 'Inspirational',
      slug: 'inspirational',
      description: 'Uplifting quotes to motivate and inspire',
      count: 150,
      icon: FaLightbulb
    },
    {
      id: 2,
      name: 'Love & Relationships',
      slug: 'love',
      description: 'Quotes about love, friendship, and connections',
      count: 120,
      icon: FaHeart
    },
    {
      id: 3,
      name: 'Humor',
      slug: 'humor',
      description: 'Funny and witty quotes to brighten your day',
      count: 80,
      icon: FaLaugh
    },
    {
      id: 4,
      name: 'Wisdom',
      slug: 'wisdom',
      description: 'Philosophical and thought-provoking quotes',
      count: 200,
      icon: FaBook
    },
    {
      id: 5,
      name: 'Success',
      slug: 'success',
      description: 'Quotes about achievement and personal growth',
      count: 100,
      icon: FaStar
    },
    {
      id: 6,
      name: 'Career & Business',
      slug: 'career',
      description: 'Professional and entrepreneurial insights',
      count: 90,
      icon: FaBriefcase
    },
    {
      id: 7,
      name: 'Leadership',
      slug: 'leadership',
      description: 'Quotes about leading and influencing others',
      count: 70,
      icon: FaUsers
    },
    {
      id: 8,
      name: 'Life & Mindfulness',
      slug: 'life',
      description: 'Quotes about living mindfully and purposefully',
      count: 130,
      icon: FaLeaf
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Quote Categories</h1>
        <p className="text-gray-400">Explore our collection of quotes by category</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Link href={`/quotes/${category.slug}`} key={category.id} className="block">
            <div className="group p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center mb-4">
                <category.icon className="w-6 h-6 mr-3 text-primary-500" />
                <h3 className="text-xl font-semibold">{category.name}</h3>
              </div>
              <p className="text-gray-400 mb-4">{category.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary-400">{category.count} quotes</span>
                <span className="text-sm text-gray-400 group-hover:translate-x-2 transition-transform duration-300">
                  Browse →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 