export const useUrls = (ports: number[]) => {
  return ports.map(port => `http://localhost:${port}`);
};
