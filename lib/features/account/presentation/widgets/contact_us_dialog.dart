import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/config/app_config.dart';
import '../../../../l10n/generated/app_localizations.dart';

/// Contact Us dialog inspired by the legacy dialog_contact_light with modern luxury styling.
class ContactUsDialog extends StatelessWidget {
  const ContactUsDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog<void>(
      context: context,
      builder: (_) => const ContactUsDialog(),
    );
  }

  Future<void> _openUrl(BuildContext context, String urlString) async {
    final uri = Uri.parse(urlString);
    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context).launchError),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context).launchError),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Bar with Close Action
              Align(
                alignment: AlignmentDirectional.topEnd,
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(top: 10, end: 10),
                  child: IconButton(
                    key: const Key('close-contact-dialog'),
                    icon: const Icon(Icons.close_rounded),
                    tooltip: strings.cancel,
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ),
              ),

              // Brand Identity Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: colors.primary.withValues(alpha: 0.2),
                            blurRadius: 16,
                            spreadRadius: 2,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Image.asset(
                          'assets/images/branding/app_logo_circle.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Image.asset(
                            'assets/images/branding/app_icon_1024.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      strings.appName,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: colors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      strings.appSlogan,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      strings.aboutAppDescription,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),
              Divider(height: 1, color: colors.outlineVariant.withValues(alpha: 0.5)),

              // Contact Channels Section
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                color: colors.surfaceContainerHighest.withValues(alpha: 0.35),
                child: Column(
                  children: [
                    Text(
                      strings.contactUsVia,
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colors.primary,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Channels Icons Row
                    Wrap(
                      spacing: 12,
                      runSpacing: 10,
                      alignment: WrapAlignment.center,
                      children: [
                        _ChannelButton(
                          key: const Key('contact-whatsapp'),
                          icon: Icons.chat_bubble_rounded,
                          label: strings.contactChannelWhatsapp,
                          onPressed: () => _openUrl(
                            context,
                            'https://wa.me/${AppConfig.contactWhatsappNumber}',
                          ),
                        ),
                        _ChannelButton(
                          key: const Key('contact-phone'),
                          icon: Icons.phone_rounded,
                          label: strings.contactChannelMobile,
                          onPressed: () => _openUrl(
                            context,
                            'tel:${AppConfig.contactPhone}',
                          ),
                        ),
                        _ChannelButton(
                          key: const Key('contact-email'),
                          icon: Icons.email_rounded,
                          label: strings.contactChannelEmail,
                          onPressed: () => _openUrl(
                            context,
                            'mailto:${AppConfig.contactEmail}?subject=${Uri.encodeComponent(strings.appName)}',
                          ),
                        ),
                        _ChannelButton(
                          key: const Key('contact-facebook'),
                          icon: Icons.facebook_rounded,
                          label: strings.contactChannelFacebook,
                          onPressed: () => _openUrl(
                            context,
                            AppConfig.contactFacebookUrl,
                          ),
                        ),
                        _ChannelButton(
                          key: const Key('contact-twitter'),
                          icon: Icons.alternate_email_rounded,
                          label: strings.contactChannelTwitter,
                          onPressed: () => _openUrl(
                            context,
                            AppConfig.contactTwitterUrl,
                          ),
                        ),
                        _ChannelButton(
                          key: const Key('contact-instagram'),
                          icon: Icons.camera_alt_rounded,
                          label: strings.contactChannelInstagram,
                          onPressed: () => _openUrl(
                            context,
                            AppConfig.contactInstagramUrl,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Divider(
                      height: 1,
                      color: colors.outlineVariant.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 10),

                    // Hudhud Web Portal Reference Button
                    TextButton.icon(
                      key: const Key('contact-website'),
                      icon: const Icon(Icons.language_rounded, size: 18),
                      label: Text(
                        strings.contactChannelWebsite,
                        style: theme.textTheme.labelMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      onPressed: () => _openUrl(
                        context,
                        AppConfig.websiteUrl,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelButton extends StatelessWidget {
  const _ChannelButton({
    required this.icon,
    required this.label,
    required this.onPressed,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Tooltip(
      message: label,
      child: Material(
        color: colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: colors.outlineVariant.withValues(alpha: 0.6)),
        ),
        elevation: 1,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 20, color: colors.primary),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
