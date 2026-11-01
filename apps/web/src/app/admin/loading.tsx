import { BrandedLoading } from "@/components/layout/branded-loading";

export default function AdminLoading() {
  return <BrandedLoading message="Preparing admin workspace..." fullScreen={false} />;
}
