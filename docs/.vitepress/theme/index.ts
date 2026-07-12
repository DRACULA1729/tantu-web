import DefaultTheme from "vitepress/theme";
import { inBrowser } from "vitepress";
import type { Theme } from "vitepress";
import { h, defineComponent, onMounted } from "vue";
import { setupRouterMotion, setupDomMotion } from "./motion";
import "./custom.css";

const Layout = defineComponent({
  name: "TantuLayout",
  setup() {
    onMounted(() => setupDomMotion());
    return () => h(DefaultTheme.Layout);
  },
});

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ router }) {
    if (inBrowser) setupRouterMotion(router);
  },
} satisfies Theme;
