import { Grid3X3, Image, List } from "lucide-react";
import { Button } from "@/components/atoms/button";

export type PostViewType = 'grid' | 'image' | 'succinct';

interface PostViewSelectorProps {
  currentView: PostViewType;
  onViewChange: (view: PostViewType) => void;
}

const viewOptions = [
  { key: 'grid' as PostViewType, label: 'Grid', icon: Grid3X3, description: 'Default card view' },
  { key: 'image' as PostViewType, label: 'Image', icon: Image, description: 'Focus on media' },
  { key: 'succinct' as PostViewType, label: 'List', icon: List, description: 'Compact list view' },
];

export default function PostViewSelector({ currentView, onViewChange }: PostViewSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {viewOptions.map(({ key, label, icon: Icon, description }) => (
        <Button
          key={key}
          variant={currentView === key ? 'solid' : 'ghost'}
          intent={currentView === key ? 'primary' : 'secondary'}
          size="1"
          onClick={() => onViewChange(key)}
          className={`flex items-center gap-1 px-3 py-1 transition-all ${
            currentView === key 
              ? 'bg-white shadow-sm text-lime-700' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
          title={description}
        >
          <Icon className="w-3 h-3" />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
}


