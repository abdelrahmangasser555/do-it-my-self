// Root layout for the Storage Control Room application
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppModeProvider } from '@/lib/app-mode-context';
import { ThemeProvider } from '@/lib/theme-context';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{var t=localStorage.getItem("dropout-theme");var d=document.documentElement;d.classList.remove("dark","light");if(t==="light"){d.classList.add("light")}else if(t==="system"){d.classList.add(window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}else{d.classList.add("dark")}}catch(e){d.classList.add("dark")}})();

              (function(){try{var m=localStorage.getItem("dropout-app-mode");var d=document.documentElement;if(m){d.dataset.appMode=m}}catch(e){}})();

              (function(){
                var matcher=/Cannot read properties of undefined \(reading 'projection'\)|migrateProjection|maplibre-gl/i;
                var matches=function(value){
                  if(!value)return false;
                  if(typeof value==="string")return matcher.test(value);
                  if(typeof value==="object"){
                    var text="";
                    if(typeof value.message==="string")text+=value.message+"\n";
                    if(typeof value.stack==="string")text+=value.stack+"\n";
                    if(typeof value.filename==="string")text+=value.filename;
                    return matcher.test(text);
                  }
                  return false;
                };
                var matchesArgs=function(args){
                  for(var i=0;i<args.length;i+=1){
                    if(matches(args[i]))return true;
                  }
                  return false;
                };
                var originalConsoleError=console.error?console.error.bind(console):null;
                if(originalConsoleError){
                  console.error=function(){
                    if(matchesArgs(arguments))return;
                    originalConsoleError.apply(console, arguments);
                  };
                }
                var originalWindowOnError=window.onerror;
                window.onerror=function(message, source, lineno, colno, error){
                  if(matches(error)||matches(message)||matches(source)){
                    return true;
                  }
                  if(typeof originalWindowOnError==="function"){
                    return originalWindowOnError(message, source, lineno, colno, error);
                  }
                  return false;
                };
                window.addEventListener("error",function(event){
                  if(matches(event.error)||matches(event.message)||matches(event.filename)){
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                },true);
                window.addEventListener("unhandledrejection",function(event){
                  if(matches(event.reason)){
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                },true);
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AppModeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AppModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
