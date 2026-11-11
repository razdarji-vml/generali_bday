import Image from "next/image";

/** Generali red square with the white lion — same lockup as the Here/Now postcards. */
export function Lockup({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`lockup ${className}`} style={{ width: size, height: size }}>
      <Image src="/generali-mark-white.png" alt="Generali" width={764} height={614} priority />
    </div>
  );
}
