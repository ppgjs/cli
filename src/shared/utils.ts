export const sleep = (delay = 1000) => {
  return new Promise(res => {
    setTimeout(() => {
      res('睡眠完成');
    }, delay);
  });
};
