import Link from 'next/link';

interface DomainCardProps {
  title: string;
  description: string;
  slug: string;
}

export function DomainCard({ title, description, slug }: DomainCardProps) {
  return (
    <Link 
      href={`/domains/${slug}`}
      className="block p-6 rounded-lg border hover:border-blue-500 hover:shadow-lg transition-all"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
} 