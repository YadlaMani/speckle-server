import { FaceSmileIcon } from '@heroicons/vue/24/outline'
import { Meta, StoryObj } from '@storybook/vue3'
import DialogSection from '~~/src/components/layout/DialogSection.vue'

export default {
  component: DialogSection,
  parameters: {
    docs: {
      description: {
        component: 'Standard disclosure panel'
      }
    }
  },
  argTypes: {
    color: {
      options: ['default', 'danger'],
      control: { type: 'select' }
    },
    icon: {
      type: 'function'
    }
  }
} as Meta

export const Default: StoryObj = {
  render: (args) => ({
    components: { DialogSection },
    setup() {
      return { args }
    },
    template: `
    <div>
      <DialogSection v-bind="args">
        <div class="flex flex-col text-foreground space-y-4">
          <div class="h4 font-bold">Hello world!</div>
          <div>Lorem ipsum blah blah blah</div>
        </div>
      </DialogSection>
    </div>`
  }),
  args: {
    title: 'Disclosure title',
    color: 'primary',
    icon: FaceSmileIcon,
    borderT: true,
    borderB: true
  }
}

export const NoBorders: StoryObj = {
  ...Default,
  args: {
    ...Default.args,
    borderT: false,
    borderB: false
  }
}

export const WithButton: StoryObj = {
  ...Default,
  args: {
    ...Default.args,
    button: {
      text: 'Button Label',
      to: 'https://www.google.com'
    }
  }
}

export const AlwaysOpen: StoryObj = {
  ...Default,
  args: {
    ...Default.args,
    alwaysOpen: true
  }
}

export const ButtonExpandsContent: StoryObj = {
  ...Default,
  args: {
    ...Default.args,
    button: {
      text: 'Delete',
      expandContent: true,
      color: 'danger'
    }
  }
}
