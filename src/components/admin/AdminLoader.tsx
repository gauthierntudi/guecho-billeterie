import { PageLoader } from "@/components/layout/PageLoader";

type AdminLoaderProps = {
  variant?: "full" | "inline";
  label?: string;
  className?: string;
};

export function AdminLoader(props: AdminLoaderProps) {
  return <PageLoader theme="admin" {...props} />;
}
