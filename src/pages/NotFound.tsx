import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-16">
      <div className="text-2xl font-semibold tracking-tight">Page not found</div>
      <div className="mt-2 text-sm text-muted-foreground">The page you opened does not exist.</div>
      <div className="mt-6">
        <Link href="/">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
