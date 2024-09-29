
const getDomainName = (url)=>{
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');
        if (parts.length > 2) {
          return parts.slice(-2).join('.');
        }
        return hostname;
      } catch (e) {
        return url;
    }
}