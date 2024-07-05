import React, { useState, ReactNode } from "react";

interface ExpandableDivProps {
  buttonText: string;
  expandedContent: ReactNode;
}

const ExpandableDiv: React.FC<ExpandableDivProps> = ({
  buttonText,
  expandedContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-1 h-auto">
      <button className="underline" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? "↓ Hide Content" : "→ " + buttonText}
      </button>
      {isExpanded && <div className="rounded-lg">{expandedContent}</div>}
    </div>
  );
};

export default ExpandableDiv;
