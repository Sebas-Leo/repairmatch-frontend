import {
  Microwave,
  Refrigerator,
  WashingMachine,
  Wrench,
  type LucideProps,
} from 'lucide-react';

/** The drawn icon for an appliance type, matched by its catalog name. */
export function ApplianceIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const key = name.toLowerCase();
  if (/refri|fridge|nevera/.test(key)) return <Refrigerator {...props} />;
  if (/wash|lavad/.test(key)) return <WashingMachine {...props} />;
  if (/micro/.test(key)) return <Microwave {...props} />;
  return <Wrench {...props} />;
}
