import { useRouter } from 'next/router';
import React from 'react';

interface BookCardProps {
  eventId: string;
  title: string;
  author: string;
  description: string;
  imageUrl: string;
  rating: number;
}

const BookCard: React.FC<BookCardProps> = ({ eventId, title, author, description, imageUrl, rating }) => {
  const router = useRouter();

  const handleDivClick = () => {
    router.push('/book/' + eventId); // Navigate to the dynamic page with id 1
  };
  return (
    <div onClick={handleDivClick} className="w-48 bg-white rounded-lg border border-gray-200 shadow-md  mr-4 mb-2 cursor-pointer hover:bg-gray-100 hover:shadow-2xl transition duration-200">
      <img className="w-full h-48 rounded-t-lg object-cover" src={imageUrl || "/book-covers.jpg"} alt={`${title} cover`} />
      <div className="p-5">
        <h5 className="text-xl font-bold tracking-tight text-gray-900 truncate">{title}</h5>
        <p className="text-gray-700 mb-2 text-sm">{author}</p>
      </div>
    </div>
  );
};

export default BookCard;
