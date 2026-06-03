import { Construction } from "lucide-react";

export default function ComingSoonBanner({ feature = "This feature" }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
      <Construction className="h-5 w-5 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-800">
        <span className="font-medium">{feature}</span> is in preview mode. Data shown is for demonstration purposes.
      </p>
    </div>
  );
}
