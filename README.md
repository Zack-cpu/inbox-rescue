# Inbox Rescue ✉

找回被误放进垃圾箱和推广分类的重要 Gmail 来信。自部署、规则可解释、由你确认后恢复。

**早期本地原型：** 单账号、手动扫描，无 AI 服务，不自动恢复，不发送邮件。

## 先试演示

安装 Python 3.11+，在项目目录运行：

```sh
python -m venv .venv
```

Windows PowerShell 激活环境：

```powershell
.venv\Scripts\Activate.ps1
```

macOS / Linux 激活环境：

```sh
source .venv/bin/activate
```

然后安装并启动：

```sh
python -m pip install -e '.[dev]'
python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

打开 http://127.0.0.1:8000 。默认演示模式使用虚构邮件，不需要邮箱授权，可以体验检查、恢复、撤销。

PowerShell 如果阻止激活，可直接用 `.venv\Scripts\python.exe` 替换以上的 `python`。

## 接入自己的 Gmail

1. 在 Google Cloud 新建项目，启用 Gmail API。
2. 配置 Google Auth 同意屏幕。个人 Gmail 使用 External；处于 Testing 时，把自己的地址加入测试用户。配置权限 `https://www.googleapis.com/auth/gmail.modify`。
3. 创建 **Desktop app（桌面应用）** 类型的 OAuth 客户端。下载 JSON，放到 `data/credentials.json`，先创建 `data/` 目录。不要上传此文件。
4. 在本地已激活的环境运行 `python -m rescue.auth`，在浏览器完成 Google 授权。令牌保存在 `data/token.json`。
5. 切换到真实模式并启动：

```powershell
# Windows PowerShell
$env:INBOX_RESCUE_DEMO="0"
python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

```sh
# macOS / Linux
INBOX_RESCUE_DEMO=0 python -m uvicorn rescue.app:app --host 127.0.0.1 --port 8000
```

授权流程参考 [Google 官方 Python 入门指南](https://developers.google.com/workspace/gmail/api/quickstart/python)。每个自部署用户配置自己的 OAuth 项目；统一托管上线前需另行评估 Google 应用验证及用户数据政策。测试模式授权可能到期，需要重新连接。

`gmail.modify` 权限较广，允许读取、修改邮件，也在技术上允许发送。本项目没有实现发送操作；申请修改权限是为了支持你确认后的恢复和撤销。

## 第一版如何判断

- 扫描最近 7 天 Spam 和 Promotions，最多 100 封，排除垃圾桶。
- 检查最近 90 天最多 300 封已发送邮件，寻找收件地址及会话匹配。
- 对每封候选展示往来依据；邮件头若包含身份验证失败则提示核实。历史往来与验证头都不能证明安全。
- 可查看所有已检查邮件，没有往来依据也可能是重要邮件。达到扫描上限会提示结果不完整。
- 点击并确认恢复后，移除 `SPAM` / `CATEGORY_PROMOTIONS`，加入 `INBOX` / `CATEGORY_PERSONAL`，把标签变更记录到本地 SQLite。
- 撤销只反转本次标签变化，保留其他标签，发现明显后续冲突则拒绝覆盖。按钮保留到刷新或重新扫描前；“本次忽略”不持久保存。

新发件人通常没有历史依据，本项目不能保证找到全部漏信，也不能保证后续 Gmail 分类。Gmail 查看链接使用浏览器第一个账号，请切换到已授权的同一账号。

## 隐私

邮件在本地处理，无 AI 分析或统计服务。Gmail API 响应可能含摘要，但不会显示或存储；本地数据库只保存操作的邮件 ID 和标签变化。授权令牌以明文存储在 `data/`，请用操作系统账户权限保护。该目录已排除在 Git 和镜像构建之外。

仅供可信个人电脑使用，不要把服务端口暴露到局域网或公网。详细限制、断开授权和失败处理见 [SECURITY.md](SECURITY.md)。

## Docker

```sh
docker compose up --build
```

默认演示模式，访问 http://127.0.0.1:8000 。真实模式需先在宿主机完成授权，再设置 `INBOX_RESCUE_DEMO=0` 后启动 Compose。容器非 root 用户需要对挂载的 `data/` 有写入权限。Docker 方案尚未在所有平台验证。

## 开发与贡献

```sh
python -m pytest -q
```

`rescue/gmail.py` 负责邮箱接口，`rules.py` 负责判断，`store.py` 记录操作，`app.py` 提供本地页面与 API。测试使用模拟 Gmail，不操作真实邮件。真实授权及邮箱变更仍需测试账号验证。

参见 [贡献指南](CONTRIBUTING.md)。MIT 许可证。

后续优先级：测试账号验证 → 持久化审核/撤销历史 → 可配置与增量扫描 → 英文界面和 Outlook 接入。
