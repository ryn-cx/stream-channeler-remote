package com.streamchanneler.remote

import android.app.Activity
import android.app.AlertDialog
import android.text.InputType
import android.widget.EditText
import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSession.PromptDelegate.AlertPrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.BeforeUnloadPrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.BasePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.ButtonPrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.ChoicePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.PopupPrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.PromptResponse
import org.mozilla.geckoview.GeckoSession.PromptDelegate.RepostConfirmPrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.TextPrompt

class Prompts(private val activity: Activity) : GeckoSession.PromptDelegate {
    private class Pending(val prompt: BasePrompt) {
        val result = GeckoResult<PromptResponse>()
        private var done = false

        // TODO: Validate
        fun finish(response: PromptResponse) {
            if (done) return
            done = true
            result.complete(response)
        }
    }

    // TODO: Validate
    private fun dialog(pending: Pending): AlertDialog.Builder =
        AlertDialog.Builder(activity, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle(pending.prompt.title)
            .setOnDismissListener { pending.finish(pending.prompt.dismiss()) }

    // TODO: Validate
    override fun onAlertPrompt(
        session: GeckoSession,
        prompt: AlertPrompt,
    ): GeckoResult<PromptResponse> {
        val pending = Pending(prompt)
        dialog(pending)
            .setMessage(prompt.message)
            .setPositiveButton(android.R.string.ok, null)
            .show()
        return pending.result
    }

    // TODO: Validate
    override fun onButtonPrompt(
        session: GeckoSession,
        prompt: ButtonPrompt,
    ): GeckoResult<PromptResponse> {
        val pending = Pending(prompt)
        dialog(pending)
            .setMessage(prompt.message)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                pending.finish(prompt.confirm(ButtonPrompt.Type.POSITIVE))
            }
            .setNegativeButton(android.R.string.cancel) { _, _ ->
                pending.finish(prompt.confirm(ButtonPrompt.Type.NEGATIVE))
            }
            .show()
        return pending.result
    }

    // TODO: Validate
    override fun onTextPrompt(
        session: GeckoSession,
        prompt: TextPrompt,
    ): GeckoResult<PromptResponse> {
        val pending = Pending(prompt)
        val input = EditText(activity).apply {
            inputType = InputType.TYPE_CLASS_TEXT
            setText(prompt.defaultValue)
        }
        dialog(pending)
            .setMessage(prompt.message)
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                pending.finish(prompt.confirm(input.text.toString()))
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
        return pending.result
    }

    // TODO: Validate
    override fun onChoicePrompt(
        session: GeckoSession,
        prompt: ChoicePrompt,
    ): GeckoResult<PromptResponse> {
        val pending = Pending(prompt)
        val choices = flatten(prompt.choices)
        val labels = choices.map { it.label }.toTypedArray()
        val builder = dialog(pending).setNegativeButton(android.R.string.cancel, null)
        if (prompt.type == ChoicePrompt.Type.MULTIPLE) {
            val checked = choices.map { it.selected }.toBooleanArray()
            builder
                .setMultiChoiceItems(labels, checked) { _, index, isChecked ->
                    checked[index] = isChecked
                }
                .setPositiveButton(android.R.string.ok) { _, _ ->
                    val ids = choices.filterIndexed { index, _ -> checked[index] }.map { it.id }
                    pending.finish(prompt.confirm(ids.toTypedArray()))
                }
        } else {
            builder.setSingleChoiceItems(labels, choices.indexOfFirst { it.selected }) { dialog, index ->
                pending.finish(prompt.confirm(choices[index].id))
                dialog.dismiss()
            }
        }
        builder.show()
        return pending.result
    }

    // TODO: Validate
    private fun flatten(choices: Array<ChoicePrompt.Choice>): List<ChoicePrompt.Choice> =
        choices.flatMap { choice ->
            when {
                choice.items != null -> flatten(choice.items!!)
                choice.separator || choice.disabled -> emptyList()
                else -> listOf(choice)
            }
        }

    // TODO: Validate
    override fun onBeforeUnloadPrompt(
        session: GeckoSession,
        prompt: BeforeUnloadPrompt,
    ): GeckoResult<PromptResponse> = GeckoResult.fromValue(prompt.confirm(AllowOrDeny.ALLOW))

    // TODO: Validate
    override fun onRepostConfirmPrompt(
        session: GeckoSession,
        prompt: RepostConfirmPrompt,
    ): GeckoResult<PromptResponse> = GeckoResult.fromValue(prompt.confirm(AllowOrDeny.ALLOW))

    // TODO: Validate
    override fun onPopupPrompt(
        session: GeckoSession,
        prompt: PopupPrompt,
    ): GeckoResult<PromptResponse> = GeckoResult.fromValue(prompt.confirm(AllowOrDeny.ALLOW))
}
