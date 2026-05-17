export const formatCurrency = (n: number): string =>
  n.toLocaleString('ko-KR') + '원';

export const formatDate = (d: string): string => {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
};

export const toYearMonth = (d: string): string => d.substring(0, 7);

export const currentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const compressImage = (file: File, maxWidth = 1024): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
