import Link from "next/link";
import React from "react";

interface BookCardProps {
  eventId: string;
  title: string;
  author: string;
  description: string;
  imageUrl: string;
}

const BookCard: React.FC<BookCardProps> = ({
  eventId,
  title,
  author,
  description,
  imageUrl,
}) => {
  return (
    <Link href={"/book/" + eventId} className="no-underline">
      <div className="w-48 bg-white rounded-lg border border-gray-200 shadow-md  mr-4 mb-2 cursor-pointer hover:bg-gray-100 hover:shadow-2xl transition duration-200">
        <img
          className="w-full h-48 rounded-t-lg object-cover"
          src={imageUrl || "/book-covers.jpg"}
          alt={`${title} cover`}
        />
        <div className="p-5">
          <h5 className="text-xl font-bold tracking-tight text-gray-900 truncate">
            {title}
          </h5>
          <p className="text-gray-700 mb-2 text-sm">{author}</p>
        </div>
      </div>
    </Link>
  );
};

export default BookCard;
