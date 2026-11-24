# پذیرش زیرمجموعهٔ فضایی C3

هدف این چرخه: kernel آفلاین server/Python و CLI صریح opt-in برای Stefan یک‌بعدی؛ نه اتصال کامل PV-T/PEM و نه ادغام UI/API. حل finite-volume enthalpy با تغییر فاز هم‌دما، خواص ثابت، رسانش تنها، شروع جامد در Tm، دیوارهٔ چپ Tw>Tm و راست عایق. طول محدود است؛ مقایسه با نیمه‌بی‌نهایت تنها پیش از رسیدن جبهه به مرز معتبر است.

مرجع خوانده‌شده: Ogoh & Groulx، Stefan’s Problem: Validation of a One-Dimensional Solid-Liquid Phase Change Heat Transfer Process، بخش2 معادلات1–7 و بخش3 جدول1؛ https://www.comsol.com/paper/download/62472/groulx_paper.pdf . پارامترها: k=.21 W/mK، cp=2400 J/kgK، rho=750 kg/m3، L=175000 J/kg، Tm=313K، Tw=350K، طول=.28m. فقط پارامترها و معادلات بازنویسی می‌شوند، نه مقاله/تصویر با مجوز نامعلوم. اعداد OCR نمودارها oracle نیستند. مرجع تحلیلی از حل ریشهٔ معادلهٔ6 و انتگرال مستقل دما به‌دست می‌آید؛ مقایسه با خروجی COMSOL یا دادهٔ تجربی ادعا نمی‌شود.

الگوریتم: h=0 جامد در Tm؛ 0<h<L فاز مخلوط در Tm؛ h>L مایع با T=Tm+(h-L)/cp. شار وجه داخلی -k∆T/dx، شار چپ 2k(Tw-T0)/dx و شار راست صفر. به‌روزرسانی صریح محافظه‌کار h با dt<=.3*rho*cp*dx²/k؛ CFL ورودی حداکثر .3 (شرط مرزی نیم‌سلول سخت‌تر از داخل). بدون smoothing یا آزادسازی انرژی نهان مصنوعی.

معیارها: strict schema/واحد SI/عدد finite و بدون bool، بودجه cells<=512 و steps<=200000 و cells*steps<=20000000؛ رد پیش از تخصیص کار. دما در [Tm,Tw]؛ h>=0؛ تراز rho*dx*sum(h)=انتگرال شار مرزی با تحمل نسبی1e-10. جبههٔ گزارش‌شده طول معادل حجم مایع dx*sum(clip(h/L,0,1)) است، نه threshold دما. آزمون Neumann مستقل برای دما/جبهه/انرژی، سه شبکه و دو گام زمانی، نقطهٔ t=0 و نامعتبرها، شبکه‌بسته، immutability، CLI default-off و rollback. حد دقت فقط برای fixture آزموده‌شده پس از اجرا ثبت می‌شود، نه دقت عمومی ماده.

خروجی research-only/insufficient_evidence/projectApproval blocked و بدون اتصال به مالی یا annual-energy. CLI نیازمند --enable-research است؛ حذف آن rollback است. راهنما و receipt لازم‌اند؛ موفقیت این kernel به معنی تکمیل C3 یا کل A1–D3 نیست.
