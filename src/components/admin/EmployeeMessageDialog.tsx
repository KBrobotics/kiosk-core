// Employee Message Dialog - Send personalized messages to employees
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  HardHat, 
  Stethoscope, 
  FileText, 
  AlertTriangle,
  Calendar,
  Gift
} from 'lucide-react';
import type { Employee, KioskMessage } from '@/types/kiosk';

interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  priority: number; // 1 = high, 2 = medium, 3 = low
  icon: React.ReactNode;
  label: string;
}

// Priority mapping: 1 = high, 2 = medium, 3 = low
const PRIORITY_LABELS = {
  1: { label: 'High', class: 'bg-destructive/20 text-destructive border-destructive/30' },
  2: { label: 'Medium', class: 'bg-warning/20 text-warning border-warning/30' },
  3: { label: 'Low', class: 'bg-primary/20 text-primary border-primary/30' },
};

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'safety_shoes',
    title: 'New Safety Shoes Available',
    body: 'Your new safety shoes are ready for pickup at the main office. Please collect them at your earliest convenience.',
    priority: 2,
    icon: <HardHat className="h-4 w-4" />,
    label: 'Safety Shoes',
  },
  {
    id: 'medical_checkup',
    title: 'Medical Checkup Required',
    body: 'Please schedule your regular medical checkup. Contact HR to arrange an appointment with the company doctor.',
    priority: 1,
    icon: <Stethoscope className="h-4 w-4" />,
    label: 'Medical Checkup',
  },
  {
    id: 'document_required',
    title: 'Document Submission Required',
    body: 'Please submit the required documents to HR department as soon as possible.',
    priority: 2,
    icon: <FileText className="h-4 w-4" />,
    label: 'Documents',
  },
  {
    id: 'safety_warning',
    title: 'Safety Reminder',
    body: 'Please remember to follow all safety protocols in your work area. Your safety is our priority.',
    priority: 1,
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Safety Warning',
  },
  {
    id: 'training',
    title: 'Training Scheduled',
    body: 'You have been scheduled for a training session. Please check the calendar for date and time.',
    priority: 3,
    icon: <Calendar className="h-4 w-4" />,
    label: 'Training',
  },
  {
    id: 'bonus',
    title: 'Bonus Notification',
    body: 'Congratulations! You have received a performance bonus. Check with HR for details.',
    priority: 3,
    icon: <Gift className="h-4 w-4" />,
    label: 'Bonus',
  },
];

interface EmployeeMessageDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (message: Omit<KioskMessage, 'id' | 'created_at'>) => void;
}

export const EmployeeMessageDialog = ({
  employee,
  open,
  onOpenChange,
  onSend,
}: EmployeeMessageDialogProps) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<number>(2); // 1=high, 2=medium, 3=low
  const [sending, setSending] = useState(false);

  const handleTemplateClick = (template: MessageTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setPriority(template.priority);
  };

  const handleSubmit = async () => {
    if (!employee || !title.trim() || !body.trim()) return;
    
    setSending(true);
    
    await onSend({
      title,
      body,
      priority,
      target_type: 'employee',
      target_value: employee.id,
    });
    
    setSending(false);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPriority(2);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send Message to {employee?.name}</DialogTitle>
          <DialogDescription>
            Send a personalized message that will be displayed when {employee?.name} logs in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Templates */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              {MESSAGE_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplateClick(template)}
                  className="gap-1.5"
                >
                  {template.icon}
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter message title..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter message content..."
              className="min-h-[100px]"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={PRIORITY_LABELS[1].class}>High</Badge>
                    <span className="text-muted-foreground">— Urgent messages</span>
                  </div>
                </SelectItem>
                <SelectItem value="2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={PRIORITY_LABELS[2].class}>Medium</Badge>
                    <span className="text-muted-foreground">— Important reminders</span>
                  </div>
                </SelectItem>
                <SelectItem value="3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={PRIORITY_LABELS[3].class}>Low</Badge>
                    <span className="text-muted-foreground">— General info</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!title.trim() || !body.trim() || sending}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
