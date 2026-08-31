#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
товары.json → страница на каждый товар + страница сравнения.

Кладёт готовые исходники в _шаблоны/страницы/, дальше их собирает
инструменты/собрать.py вместе с остальными страницами:

    python собрать-товары.py
    python инструменты/собрать.py --проект .

Данные для сравнения вшиваются в сравнение.html прямым <script> — не запросом.
Так страница работает и открытая файлом с флешки, без сервера.
"""

import html
import json
import os
import sys

for поток in (sys.stdout, sys.stderr):
    try:
        поток.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

ПАПКА_СТРАНИЦ = "_шаблоны/страницы"
ПАПКА_ФОТО = "assets/products"
ЗАГЛУШКА = "assets/ph-product.svg"
СОСТОЯНИЕ = {"новая": "Новая", "бу": "Б/У с гарантией"}


def щит(текст):
    return html.escape(str(текст or "").strip(), quote=True)


def цена_текстом(число):
    return "{:,}".format(int(число)).replace(",", " ") + " ₽"


def снимки(товар):
    файлы = товар.get("фото") or []
    if not файлы:
        return [ЗАГЛУШКА]
    return ["%s/%s.webp" % (ПАПКА_ФОТО, и) for и in файлы]


def мини(товар):
    файлы = товар.get("фото") or []
    return "%s/%s-min.webp" % (ПАПКА_ФОТО, файлы[0]) if файлы else ЗАГЛУШКА


def имя_типа(данные, код):
    for т in данные["типы"]:
        if т["код"] == код:
            return т["имя"]
    return код


def карточка_похожего(товар):
    return """      <a class="card cat" href="товар-%s.html">
        <img src="%s" alt="%s" width="480" height="480" loading="lazy" decoding="async" />
        <span class="cat__name">%s</span>
        <span class="cat__note">%s</span>
      </a>""" % (щит(товар["id"]), щит(мини(товар)), щит(товар["имя"]),
                 щит(товар["имя"]), цена_текстом(товар["цена"]))


def страница_товара(товар, данные):
    ид = щит(товар["id"])
    имя = щит(товар["имя"])
    цена = int(товар["цена"])
    старая = товар.get("старая_цена")
    фото = снимки(товар)
    тип = имя_типа(данные, товар["тип"])

    # похожие — того же типа, кроме самого товара, не больше трёх
    похожие = [т for т in данные["товары"]
               if т["тип"] == товар["тип"] and т["id"] != товар["id"]][:3]

    все_снимки = "|".join(щит(п) for п in фото)
    галерея = ['        <div class="gallery" data-gallery>',
               '          <div class="gallery__main">',
               '            <img src="%s" alt="%s" width="900" height="900" loading="eager" '
               'data-gallery-main data-zoom="%s" tabindex="0" role="button" />'
               % (щит(фото[0]), имя, все_снимки),
               '            <span class="gallery__zoom">Нажмите, чтобы рассмотреть</span>',
               '          </div>']
    if len(фото) > 1:
        галерея.append('          <div class="gallery__thumbs">')
        for номер, путь in enumerate(фото):
            галерея.append(
                '            <button class="gallery__thumb%s" type="button" data-gallery-thumb="%s" '
                'aria-label="Снимок %d из %d"><img src="%s" alt="" width="480" height="480" loading="lazy" decoding="async" /></button>'
                % (" is-active" if номер == 0 else "", щит(путь), номер + 1, len(фото), щит(путь)))
        галерея.append('          </div>')
    else:
        галерея.append('          <p class="gallery__note muted">Здесь будут ваши снимки этого '
                       'товара с разных сторон — пришлите три-четыре, поставим.</p>')
    галерея.append('        </div>')

    варианты = товар.get("варианты") or []
    выбор = []
    if len(варианты) > 1:
        выбор.append('        <div class="variants" data-variants>')
        выбор.append('          <p class="variants__title">%s</p>' % щит(товар.get("строка_выбора", "Вариант")))
        выбор.append('          <div class="variants__row">')
        for номер, в in enumerate(варианты):
            выбор.append(
                '            <button class="variants__btn%s" type="button" data-variant '
                'data-price="%d" data-label="%s"%s>%s</button>'
                % (" is-active" if номер == 0 else "", int(в["цена"]), щит(в["имя"]),
                   ' data-from="1"' if в.get("от") else "", щит(в["имя"])))
        выбор.append('          </div>')
        выбор.append('        </div>')

    строки_цены = ['            <span class="pdp__price" data-price-out>%s</span>' % цена_текстом(цена)]
    if старая and старая > цена:
        строки_цены.append('            <span class="product__old">%s</span>' % цена_текстом(старая))
        строки_цены.append('            <span class="badge">−%d %%</span>'
                           % round((1 - цена / старая) * 100))

    # Главное о товаре видно сразу, до прокрутки: иначе непонятно,
    # есть ли на странице характеристики и нужно ли листать вниз.
    ГЛАВНОЕ = {
     "smartphones": ["Экран", "Процессор", "Основная камера", "Аккумулятор"],
     "tablets":     ["Экран", "Процессор", "Связь", "Перо и клавиатура"],
     "laptops":     ["Экран", "Процессор", "Оперативная память", "Автономность"],
     "watch":       ["Корпус", "Экран", "Автономность", "Защита"],
     "audio":       ["Тип", "Шумоподавление", "Автономность", "Зарядка"],
     "cameras":     ["Матрица", "Видео", "Стабилизация", "Аккумулятор"],
     "gadgets":     ["Назначение", "Дальность", "Автономность", "Связь"],
     "accessories": ["Назначение", "Совместимость", "Подключение", "Питание"],
    }
    def покороче(текст, предел=52):
        """В выжимке важна первая мысль: полная строка есть ниже, в таблице."""
        текст = текст.strip()
        if len(текст) <= предел:
            return текст
        обрез = текст[:предел]
        точка = max(обрез.rfind(", "), обрез.rfind(" + "))
        if точка > предел * 0.5:
            return обрез[:точка] + "…"
        return обрез[:обрез.rfind(" ")] + "…"

    все_строки = dict((и, покороче(з)) for и, з in товар.get("характеристики", []))
    коротко = []
    нужные = [(и, все_строки[и]) for и in ГЛАВНОЕ.get(товар["тип"], []) if и in все_строки]
    if нужные:
        коротко.append('        <div class="pdp__short">')
        coротко_шапка = '          <p class="pdp__short-title">Коротко о товаре</p>'
        коротко.append(coротко_шапка)
        коротко.append('          <dl class="pdp__short-list">')
        for подпись, значение in нужные:
            коротко.append('            <div><dt>%s</dt><dd>%s</dd></div>'
                           % (щит(подпись), щит(значение)))
        коротко.append('          </dl>')
        коротко.append('          <a class="pdp__short-more" href="#specs">Все характеристики</a>')
        коротко.append('        </div>')

    таблица = []
    for подпись, значение in товар.get("характеристики", []):
        таблица.append('          <tr><th>%s</th><td>%s</td></tr>' % (щит(подпись), щит(значение)))

    описание = щит(товар.get("описание", ""))
    подробно = щит(товар.get("подробно", ""))

    куски = ["""<!-- страница
заголовок: %(имя)s — купить в Москве, {{название}}
описание: %(имя)s: %(описание)s Цена %(цена)s, доставка по Москве в день заказа, гарантия месяц.
адрес: товар-%(ид)s.html
-->
<!-- вставить: голова -->
<!-- вставить: шапка -->

<main id="main">

<section class="section">
  <div class="container">
    <nav class="crumbs" aria-label="Хлебные крошки">
      <a href="index.html">Главная</a>
      <span>/</span>
      <a href="каталог.html">Каталог</a>
      <span>/</span>
      <span aria-current="page">%(имя)s</span>
    </nav>

    <div class="pdp" data-id="%(ид)s" data-name="%(имя)s" data-price="%(цена_число)d" data-img="%(первое_фото)s">
      <div class="pdp__media" data-reveal>
%(галерея)s
      </div>

      <div class="pdp__info" data-reveal data-delay="1">
        <p class="eyebrow">%(тип)s · %(состояние)s</p>
        <h1 class="pdp__title">%(имя)s</h1>
        <p class="pdp__lead">%(описание)s</p>

%(выбор)s
        <div class="pdp__pricerow">
%(цена_строки)s
        </div>

        <div class="pdp__cta">
          <button class="btn btn--primary" type="button" data-add>В корзину</button>
          <button class="btn btn--ghost" type="button" data-compare>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>
            <span data-compare-label>К сравнению</span>
          </button>
        </div>

%(коротко)s
        <ul class="pdp__facts">
          <li>Гарантия 1 месяц</li>
          <li>Доставка по Москве в день заказа</li>
          <li>Можно сдать старое по Trade-in</li>
        </ul>

        <p class="muted pdp__ask">
          Нужна другая память или цвет? Напишите
          <a class="accent-text" href="{{телеграм_менеджер}}" rel="noopener" target="_blank">@appletorg_manager</a> —
          привезём под заказ.
        </p>
      </div>
    </div>
  </div>
</section>

<section class="section section--soft" id="specs">
  <div class="container">
    <div class="grid grid--fixed2">
      <div data-reveal>
        <h2 class="section-title">Характеристики</h2>
        <table class="specs">
          <tbody>
%(таблица)s
          </tbody>
        </table>
      </div>
      <div data-reveal data-delay="1">
        <h2 class="section-title">Подробнее</h2>
        <p class="section-lead">%(подробно)s</p>
        <p class="muted" style="margin-top: 1.2rem">
          Наличие меняется в течение дня. Перед поездкой в магазин напишите менеджеру —
          он подтвердит за пару минут.
        </p>
      </div>
    </div>
  </div>
</section>
""" % {"имя": имя, "ид": ид, "описание": описание, "подробно": подробно,
       "цена": цена_текстом(цена), "цена_число": цена, "тип": щит(тип),
       "состояние": СОСТОЯНИЕ.get(товар["состояние"], ""),
       "первое_фото": щит(фото[0]), "галерея": "\n".join(галерея),
       "выбор": "\n".join(выбор), "коротко": "\n".join(коротко),
       "цена_строки": "\n".join(строки_цены), "таблица": "\n".join(таблица)}]

    if похожие:
        куски.append("""
<section class="section">
  <div class="container">
    <h2 class="section-title" data-reveal>Похожие товары</h2>
    <div class="lenta" style="margin-top: 1.6rem" data-lenta data-reveal>
      <div class="cats">
%s
      </div>
    </div>
  </div>
</section>
""" % "\n".join(карточка_похожего(т) for т in похожие))

    куски.append("""
<!-- вставить: форма -->

</main>

<!-- вставить: подвал -->
<!-- вставить: корзина -->
<!-- вставить: скрипты -->
""")
    return "".join(куски)


def страница_сравнения(данные):
    """Данные вшиваются в страницу, чтобы она работала и без сервера."""
    для_сравнения = {}
    for т in данные["товары"]:
        для_сравнения[т["id"]] = {
            "имя": т["имя"], "цена": т["цена"], "тип": т["тип"],
            "фото": мини(т), "адрес": "товар-%s.html" % т["id"],
            "характеристики": т.get("характеристики", []),
        }
    сырое = json.dumps(для_сравнения, ensure_ascii=False, separators=(",", ":"))
    # </script> внутри строки закрыл бы тег раньше времени
    сырое = сырое.replace("</", "<\\/")

    return """<!-- страница
заголовок: Сравнение товаров — {{название}}
описание: Сравните характеристики выбранной техники Apple, DJI и других брендов в одной таблице.
адрес: сравнение.html
-->
<!-- вставить: голова -->
<!-- вставить: шапка -->

<main id="main">

<section class="section">
  <div class="container">
    <p class="eyebrow" data-reveal>Сравнение</p>
    <h1 class="section-title" data-reveal>Что выбрать</h1>
    <p class="section-lead" data-reveal>
      Добавляйте товары кнопкой «К сравнению» в каталоге или на странице товара —
      до четырёх штук. Строки, которые различаются, подсвечены.
    </p>

    <div data-compare-page>
      <p class="catalog__empty" data-compare-empty>
        Пока сравнивать нечего. Откройте <a class="accent-text" href="каталог.html">каталог</a>
        и нажмите «К сравнению» у пары товаров.
      </p>
      <p class="compare__hint" data-compare-hint hidden>Таблицу можно листать вбок пальцем.</p>
      <div class="compare__wrap" data-compare-table hidden></div>
      <div class="compare__foot" data-compare-foot hidden>
        <label class="facet" style="max-width: 320px">
          <input type="checkbox" data-compare-diff />
          <span>Только различия</span>
        </label>
        <button class="btn btn--ghost" type="button" data-compare-clear>Очистить сравнение</button>
      </div>
    </div>
  </div>
</section>

</main>

<!-- вставить: подвал -->
<!-- вставить: корзина -->

<script>window.ТОВАРЫ_ДЛЯ_СРАВНЕНИЯ = %s;</script>

<!-- вставить: скрипты -->
""" % сырое


def главная():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with open("товары.json", encoding="utf-8") as файл:
        данные = json.load(файл)

    # старые страницы товаров сносим: список товаров мог измениться
    for имя in os.listdir(ПАПКА_СТРАНИЦ):
        if имя.startswith("товар-") and имя.endswith(".html"):
            os.remove(os.path.join(ПАПКА_СТРАНИЦ, имя))

    for товар in данные["товары"]:
        путь = os.path.join(ПАПКА_СТРАНИЦ, "товар-%s.html" % товар["id"])
        with open(путь, "w", encoding="utf-8") as файл:
            файл.write(страница_товара(товар, данные))

    with open(os.path.join(ПАПКА_СТРАНИЦ, "сравнение.html"), "w", encoding="utf-8") as файл:
        файл.write(страница_сравнения(данные))

    print("\n  Страниц товаров: %d, плюс сравнение.html" % len(данные["товары"]))
    print("  Дальше: python инструменты/собрать.py --проект .\n")


if __name__ == "__main__":
    главная()
