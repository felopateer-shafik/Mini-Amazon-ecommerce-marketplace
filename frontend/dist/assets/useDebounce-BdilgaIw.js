import{r as u}from"./index-3pwpzVpe.js";function n(e,t=300){const[o,r]=u.useState(e);return u.useEffect(()=>{const s=setTimeout(()=>r(e),t);return()=>clearTimeout(s)},[e,t]),o}export{n as u};
