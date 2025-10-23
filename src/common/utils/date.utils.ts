
//  Oct 5 09:15 AM
export const formatDate = (dateInput: string | Date): string => {
  const date = new Date(dateInput);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleString('en-US', options).replace(',', '');
};


//  19h :11m :0s
export const getBoostTimeLeft = (boostTime: string | Date | null): string | null => {
  if (!boostTime) return null;
  
  const now = new Date().getTime();
  const end = new Date(boostTime).getTime();
  const diff = end - now;
  
  if (diff <= 0) return '(Expired)';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `(${hours}h :${minutes}m :${seconds}s)`;
};


// Jun 15, 2023
export function MonthWithDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
