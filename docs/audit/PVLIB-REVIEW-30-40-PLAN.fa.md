# بازبینی و تکمیل۳۰–۴۰ — طرح پیش از تغییر
2026-11-03؛ مبناc3f9289؛ همانشاخه، بدونmerge/historyrewrite.

موجودی ازکد:۳۰library/bundle/thermal/workflow موجود؛۳۱inventoryفقطuntrackedوتاریخی؛۳۲ماتریس۲۰۴۸فقطPythonباجفت‌هایruntime (برنامه۸۱۹۲دو زبان تکمیلنیست)؛۳۳ششعددثابتودوازدهشاهدنام‌دارمحلینسخه‌نشده؛۳۴adapterاعلام‌شده/receipt/UI/archiveغایب؛۳۵DCcableموجود؛۳۶multiMPPTموجود؛۳۷blocksموجود؛۳۸ACcableغایب؛۳۹auxscheduleموجود؛۴۰exportscheduleموجود.

اجرای ایننوبت:۱)بازبینی۳۴/۳۸باپژوهشقبلکد و رفعguardهایبازتولیدپذیر؛۲)تکمیلinventoryجاریدرکنارsnapshotتاریخی؛۳)ماتریس۸۱۹۲contractدو زبان باexpectedrulesمستقل وruntimepaircover وartifactوضعیتهرcase؛۴)registryنسخه‌دارتمامشواهدنام‌دار/دامنه/tolerance/حساسیت،نهفقطششعدد؛۵)adapterصریحunit-onlyباpreview/confirm/receipt/rawretentionودرونarchive؛۶)مدلACcableمحدودunityPFsignedباورودیΩ/V/Aصریح،فقطroot،پسازauxiliaryوپیشازtransformer؛۷)تستواقعیPython/HTTP/مرورگر/archive،رگرسیون،audit/build/lint/tscوCIدقیقSHA.

دامنه۳۸: balanced_three_phase_lv،resistancePerPhaseOhm،receivingLineVoltageV،maxCurrentA وsource/quality. loss=3RI²،I=|Pout|/(sqrt(3)Vll)،Pin=Pout+loss. حلشاخهmonotonicباپایداریعددی؛overcurrent/discriminantرد،بدونclipمصنوعی،بدونreactance/voltageflow/PFغیریک/حرارت/طراحیایمنی. مصرفsignedورودیواردمی‌شود. transformerl lossپسازکابل؛curtailment/exportcapهنوزdownstreamبدونبازحلDC/ACnetwork.

پژوهشپیشکد: pvlib0.13.1 transformer.simple_efficiency (ترازsigned وimportsشب) وiotools.read_psm3 (وجودmetadata/unitبه‌تنهاییتأییدارتفاعبادومعنایبازه‌نیست) دوبارهخواندهشدند. I²R/قانوناهم و توازنP مدلکابل را تعریفمی‌کند؛unitconversionفقطباmanifestصریح است، نهتشخیصخودکارprovider.
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.transformer.simple_efficiency.html
https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iotools.read_psm3.html

محدودیت‌هایذاتیscopeمدل‌ها (کنترلگذرا/fieldcalibration/دادهواقعی) به‌عنوانfeatureبرنامه‌ریزی‌شدهتکمیل‌نشدهجا‌زده‌نمی‌شوند؛بهجایادعایبی‌خطایی/دقت‌میدانی،شواهدقابل‌اجراومرزدامنهثبتخواهدشد. دادهٔساعتیمفقوداختراع/صفرپرنمی‌شود.
