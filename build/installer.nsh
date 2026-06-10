!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "卸载 爆品广告工作台"
  !define MUI_WELCOMEPAGE_TEXT "将从电脑中移除程序文件。"
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
