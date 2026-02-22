import { Children } from "react";

export default function Col({
  sm = null,
  md = null,
  lg = null,
  children,
}: {
  sm: string | null;
  md: string | null;
  lg: string | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="col">{children}</div>
    </>
  );
}
