import {
  AirVent,
  CookingPot,
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
  if (/aire|air|clima/.test(key)) return <AirVent {...props} />;
  if (/horno|oven|cocina|stove/.test(key)) return <CookingPot {...props} />;
  return <Wrench {...props} />;
}
